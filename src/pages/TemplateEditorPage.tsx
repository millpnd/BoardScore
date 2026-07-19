import {
  Alert,
  Grid,
  Group,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { AlertCircle, Blocks, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'

import { useTemplateStore } from '@/app/useStores'
import {
  AppLayout,
  BackButton,
  CardSection,
  EmptyState,
  Header,
  NumberInput,
  PageContainer,
  PrimaryButton,
} from '@/components'
import type { GameTemplate } from '@/models'
import { RoundType, ScoringType, WinnerRule } from '@/models'
import { createEntityId } from '@/utils/createEntityId'

interface TemplateFormValues {
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly minimumPlayers: number | ''
  readonly maximumPlayers: number | ''
  readonly scoringType: ScoringType
  readonly winnerRule: WinnerRule
  readonly roundType: RoundType
  readonly totalRounds: number | ''
}

const iconOptions = [
  { value: 'dice', label: 'Dice' },
  { value: 'cards', label: 'Cards' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'shapes', label: 'Shapes' },
  { value: 'whole-word', label: 'Word' },
]

const scoringLabels = {
  [ScoringType.RunningTotal]: 'Running Total',
  [ScoringType.PerRound]: 'Per Round',
} satisfies Record<ScoringType, string>

const scoringDescriptions = {
  [ScoringType.RunningTotal]:
    'Scores are added continuously throughout the game.',
  [ScoringType.PerRound]:
    'Scores are entered by round and combined for the final total.',
} satisfies Record<ScoringType, string>

const winnerLabels = {
  [WinnerRule.HighestScore]: 'Highest Score Wins',
  [WinnerRule.LowestScore]: 'Lowest Score Wins',
} satisfies Record<WinnerRule, string>

const roundLabels = {
  [RoundType.Unlimited]: 'Unlimited Rounds',
  [RoundType.Fixed]: 'Fixed Number of Rounds',
} satisfies Record<RoundType, string>

const numberValue = (value: number | string): number | '' =>
  typeof value === 'number' && Number.isFinite(value) ? value : ''

const defaultValues = (): TemplateFormValues => ({
  name: '',
  description: '',
  icon: 'dice',
  minimumPlayers: 2,
  maximumPlayers: '',
  scoringType: ScoringType.RunningTotal,
  winnerRule: WinnerRule.HighestScore,
  roundType: RoundType.Unlimited,
  totalRounds: '',
})

const valuesFromTemplate = (template: GameTemplate): TemplateFormValues => ({
  name: template.name,
  description: template.description,
  icon: template.icon,
  minimumPlayers: template.minimumPlayers,
  maximumPlayers: template.maximumPlayers ?? '',
  scoringType: template.scoringType,
  winnerRule: template.winnerRule,
  roundType: template.roundConfiguration.type,
  totalRounds:
    template.roundConfiguration.type === RoundType.Fixed
      ? template.roundConfiguration.totalRounds
      : '',
})

const toTemplate = (
  values: TemplateFormValues,
  existingTemplate: GameTemplate | undefined,
): GameTemplate => ({
  id: existingTemplate?.id ?? createEntityId(),
  name: values.name.trim(),
  description: values.description.trim(),
  icon: values.icon,
  minimumPlayers:
    typeof values.minimumPlayers === 'number' ? values.minimumPlayers : 0,
  maximumPlayers:
    typeof values.maximumPlayers === 'number' ? values.maximumPlayers : null,
  scoringType: values.scoringType,
  winnerRule: values.winnerRule,
  roundConfiguration:
    values.roundType === RoundType.Fixed
      ? {
          type: RoundType.Fixed,
          totalRounds:
            typeof values.totalRounds === 'number' ? values.totalRounds : 0,
        }
      : { type: RoundType.Unlimited },
  theme: existingTemplate?.theme,
  isBuiltIn: false,
  version: existingTemplate?.version ?? 1,
})

export function TemplateEditorPage() {
  const navigate = useNavigate()
  const { templateId } = useParams()
  const templates = useTemplateStore((state) => state.templates)
  const isLoading = useTemplateStore((state) => state.isLoading)
  const error = useTemplateStore((state) => state.error)
  const loadTemplates = useTemplateStore((state) => state.loadTemplates)
  const addTemplate = useTemplateStore((state) => state.addTemplate)
  const updateTemplate = useTemplateStore((state) => state.updateTemplate)
  const [hasLoaded, setHasLoaded] = useState(false)
  const editing = templateId !== undefined
  const existingTemplate = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templateId, templates],
  )

  const { control, formState, handleSubmit, register, reset } =
    useForm<TemplateFormValues>({
      defaultValues: defaultValues(),
    })

  const roundType = useWatch({ control, name: 'roundType' })
  const minimumPlayers = useWatch({ control, name: 'minimumPlayers' })

  useEffect(() => {
    let active = true
    void loadTemplates().finally(() => {
      if (active) setHasLoaded(true)
    })
    return () => {
      active = false
    }
  }, [loadTemplates])

  useEffect(() => {
    if (existingTemplate && !existingTemplate.isBuiltIn) {
      reset(valuesFromTemplate(existingTemplate))
    }
  }, [existingTemplate, reset])

  const submit = handleSubmit(async (values) => {
    const template = toTemplate(values, existingTemplate)
    const saved = editing
      ? await updateTemplate(template)
      : await addTemplate(template)
    if (saved) {
      navigate('/templates', {
        state: {
          message: editing ? 'Custom game updated.' : 'Custom game created.',
        },
      })
    }
  })

  if (!hasLoaded && templates.length === 0) {
    return (
      <AppLayout header={<Header title="Template Editor" />}>
        <PageContainer py="xl">
          <Text c="dimmed">Loading template.</Text>
        </PageContainer>
      </AppLayout>
    )
  }

  if (editing && existingTemplate?.isBuiltIn) {
    return (
      <AppLayout
        header={
          <Header
            leading={<BackButton onClick={() => navigate('/templates')} />}
            title="Template Editor"
          />
        }
      >
        <PageContainer py="xl">
          <EmptyState
            action={
              <PrimaryButton onClick={() => navigate('/templates')}>
                Manage custom games
              </PrimaryButton>
            }
            description="Built-in games are part of BoardScore and cannot be edited."
            icon={<Blocks size={28} />}
            title="Built-in game locked"
          />
        </PageContainer>
      </AppLayout>
    )
  }

  if (editing && !existingTemplate) {
    return (
      <AppLayout
        header={
          <Header
            leading={<BackButton onClick={() => navigate('/templates')} />}
            title="Template Editor"
          />
        }
      >
        <PageContainer py="xl">
          <EmptyState
            action={
              <PrimaryButton onClick={() => navigate('/templates')}>
                Manage custom games
              </PrimaryButton>
            }
            description="That custom game template could not be found on this device."
            icon={<AlertCircle size={28} />}
            title="Template not found"
          />
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      header={
        <Header
          leading={<BackButton onClick={() => navigate('/templates')} />}
          subtitle={
            editing
              ? 'Changes apply to future games only'
              : 'Saved on this device'
          }
          title={editing ? 'Edit Custom Game' : 'Create Custom Game'}
        />
      }
    >
      <PageContainer py="xl">
        <Stack
          component="form"
          gap="lg"
          id="template-editor-form"
          onSubmit={(event) => void submit(event)}
        >
          {error ? (
            <Alert
              color="red"
              icon={<AlertCircle aria-hidden size={20} />}
              title="Template not saved"
            >
              {error}
            </Alert>
          ) : null}

          <CardSection labelledBy="template-details-heading">
            <Title id="template-details-heading" order={2} size="h3">
              Template details
            </Title>
            <TextInput
              autoFocus
              error={formState.errors.name?.message}
              label="Game Name"
              maxLength={60}
              placeholder="House Rules"
              size="lg"
              {...register('name', {
                required: 'Game name is required.',
                validate: (value) =>
                  value.trim().length > 0 || 'Game name is required.',
              })}
            />
            <Textarea
              error={formState.errors.description?.message}
              label="Description"
              maxLength={160}
              minRows={2}
              placeholder="Track points for your table's version."
              size="lg"
              {...register('description', {
                required: 'Description is required.',
                validate: (value) =>
                  value.trim().length > 0 || 'Description is required.',
              })}
            />
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <Select
                  allowDeselect={false}
                  data={iconOptions}
                  label="Icon"
                  onChange={(value) => {
                    if (value) field.onChange(value)
                  }}
                  size="lg"
                  value={field.value}
                />
              )}
            />
          </CardSection>

          <CardSection labelledBy="scoring-heading">
            <Title id="scoring-heading" order={2} size="h3">
              Scoring
            </Title>
            <Controller
              control={control}
              name="scoringType"
              render={({ field }) => (
                <Radio.Group
                  label="Scoring Type"
                  onChange={(value) => field.onChange(value as ScoringType)}
                  value={field.value}
                >
                  <Stack mt="xs">
                    {Object.values(ScoringType).map((value) => (
                      <Radio
                        description={scoringDescriptions[value]}
                        key={value}
                        label={scoringLabels[value]}
                        value={value}
                      />
                    ))}
                  </Stack>
                </Radio.Group>
              )}
            />
            <Controller
              control={control}
              name="winnerRule"
              render={({ field }) => (
                <Select
                  allowDeselect={false}
                  data={Object.values(WinnerRule).map((value) => ({
                    value,
                    label: winnerLabels[value],
                  }))}
                  label="Winner Rule"
                  onChange={(value) => {
                    if (value) field.onChange(value as WinnerRule)
                  }}
                  size="lg"
                  value={field.value}
                />
              )}
            />
          </CardSection>

          <CardSection labelledBy="rounds-heading">
            <Title id="rounds-heading" order={2} size="h3">
              Rounds
            </Title>
            <Controller
              control={control}
              name="roundType"
              render={({ field }) => (
                <Radio.Group
                  label="Round Type"
                  onChange={(value) => field.onChange(value as RoundType)}
                  value={field.value}
                >
                  <Stack mt="xs">
                    {Object.values(RoundType).map((value) => (
                      <Radio
                        key={value}
                        label={roundLabels[value]}
                        value={value}
                      />
                    ))}
                  </Stack>
                </Radio.Group>
              )}
            />
            {roundType === RoundType.Fixed ? (
              <Controller
                control={control}
                name="totalRounds"
                render={({ field, fieldState }) => (
                  <NumberInput
                    allowDecimal={false}
                    allowNegative={false}
                    error={fieldState.error?.message}
                    label="Number of Rounds"
                    min={1}
                    onChange={(value) => field.onChange(numberValue(value))}
                    placeholder="5"
                    value={field.value}
                  />
                )}
                rules={{
                  validate: (value) =>
                    (typeof value === 'number' &&
                      Number.isInteger(value) &&
                      value > 0) ||
                    'Number of rounds must be greater than zero.',
                }}
              />
            ) : null}
          </CardSection>

          <CardSection labelledBy="players-heading">
            <Title id="players-heading" order={2} size="h3">
              Players
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Controller
                  control={control}
                  name="minimumPlayers"
                  render={({ field, fieldState }) => (
                    <NumberInput
                      allowDecimal={false}
                      allowNegative={false}
                      error={fieldState.error?.message}
                      label="Minimum Players"
                      min={2}
                      onChange={(value) => field.onChange(numberValue(value))}
                      value={field.value}
                    />
                  )}
                  rules={{
                    validate: (value) =>
                      (typeof value === 'number' &&
                        Number.isInteger(value) &&
                        value >= 2) ||
                      'Minimum players must be at least 2.',
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Controller
                  control={control}
                  name="maximumPlayers"
                  render={({ field, fieldState }) => (
                    <NumberInput
                      allowDecimal={false}
                      allowNegative={false}
                      error={fieldState.error?.message}
                      label="Maximum Players"
                      min={2}
                      onChange={(value) => field.onChange(numberValue(value))}
                      placeholder="No limit"
                      value={field.value}
                    />
                  )}
                  rules={{
                    validate: (value) => {
                      if (value === '') return true
                      if (
                        typeof minimumPlayers !== 'number' ||
                        !Number.isInteger(value)
                      ) {
                        return 'Maximum players must be a whole number.'
                      }
                      return (
                        value >= minimumPlayers ||
                        'Maximum players must be greater than or equal to minimum players.'
                      )
                    },
                  }}
                />
              </Grid.Col>
            </Grid>
          </CardSection>

          <Group justify="flex-end">
            <PrimaryButton
              leftSection={<Save aria-hidden size={20} />}
              loading={formState.isSubmitting || isLoading}
              type="submit"
            >
              Save Template
            </PrimaryButton>
          </Group>
        </Stack>
      </PageContainer>
    </AppLayout>
  )
}
