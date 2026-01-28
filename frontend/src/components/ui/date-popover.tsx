"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"

type Range = { from?: Date; to?: Date }

type SingleProps = {
  mode: "single"
  value: Date | undefined
  onChange: (value: Date | undefined) => void
  id?: string
  placeholder?: string
  disabledDays?: (date: Date) => boolean
  align?: "start" | "center" | "end"
  className?: string
  onToday?: () => Date | undefined
}

type RangeProps = {
  mode: "range"
  value: DateRange | Range
  onChange: (value: DateRange | Range) => void
  id?: string
  placeholder?: string
  numberOfMonths?: number
  disabledDays?: (date: Date) => boolean
  align?: "start" | "center" | "end"
  className?: string
  onToday?: () => DateRange | Range
}

export type DatePopoverProps = SingleProps | RangeProps

const formatDDMMYYYY = (d?: Date) => {
  if (!d) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function DatePopover(props: DatePopoverProps) {
  const isRange = props.mode === "range"
  const align = props.align ?? "start"
  const placeholder = props.placeholder ?? (isRange ? "Date Range" : "dd/mm/yyyy")
  const [open, setOpen] = React.useState(false)

  if (isRange) {
    const { value, onChange, id, numberOfMonths, disabledDays, className } = props
    const label = value?.from
      ? value.to
        ? `${formatDDMMYYYY(value.from)} - ${formatDDMMYYYY(value.to)}`
        : `${formatDDMMYYYY(value.from)} - `
      : placeholder

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" className={"w-full justify-start " + (className ?? "") }>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="p-0">
            <Calendar
              mode="range"
              selected={value as DateRange}
              onSelect={(r: any) => {
                const next = r as DateRange
                onChange(next)
                if (next?.from && next?.to) {
                  setOpen(false)
                }
              }}
              numberOfMonths={numberOfMonths ?? 2}
              initialFocus
              disabled={disabledDays as any}
            />
          </div>
          <div className="flex items-center justify-between p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({} as any)
                setOpen(false)
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                onChange({ from: today, to: today } as any)
                setOpen(false)
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const { value, onChange, id, disabledDays, className } = props
  const label = value ? formatDDMMYYYY(value) : (props.placeholder ?? "dd/mm/yyyy")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className={"w-full justify-start text-left font-normal " + (className ?? "") }>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              onChange(d)
              if (d) setOpen(false)
            }}
            initialFocus
            disabled={disabledDays as any}
          />
        </div>
        <div className="flex items-center justify-between p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(undefined)
              setOpen(false)
            }}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const custom = (props as SingleProps).onToday?.()
              onChange(custom ?? today)
              setOpen(false)
            }}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
